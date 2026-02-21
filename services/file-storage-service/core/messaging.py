"""
Async RabbitMQ publisher using aio-pika (Fix 6+7).

Key improvements over the previous pika-based implementation:
  - Fully async: no blocking I/O on the FastAPI event loop.
  - Uses connect_robust() which reconnects automatically after broker restarts.
  - Each _publish() opens a fresh channel so there is no shared mutable state
    across concurrent coroutines (eliminates the threading.Lock requirement).
  - On publish failure, retries once after reconnecting before raising, so the
    caller (process_upload) knows if the event was permanently lost.
"""

from __future__ import annotations

import json
import logging
import os

import aio_pika
from aio_pika import DeliveryMode, ExchangeType, Message


class AsyncMessagePublisher:
    def __init__(self) -> None:
        self.host = os.getenv("RABBITMQ_HOST", "localhost")
        self.queue_name = "ingestion_queue"
        self.exchange_name = "file_events_topic"
        self._connection: aio_pika.abc.AbstractRobustConnection | None = None

    async def connect(self) -> None:
        """Establish a robust connection that auto-reconnects on broker restart."""
        url = f"amqp://guest:guest@{self.host}/"
        self._connection = await aio_pika.connect_robust(url)
        logging.info("[messaging] Connected to RabbitMQ (aio-pika)")

    async def close(self) -> None:
        """Gracefully close the connection on application shutdown."""
        if self._connection and not self._connection.is_closed:
            await self._connection.close()

    async def publish_file_ready(
        self, file_id: str, file_name: str, metadata: dict | None = None
    ) -> None:
        await self._publish(
            routing_key="file.ready",
            message={
                "event": "file.ready",
                "file_id": file_id,
                "file_name": file_name,
                "metadata": metadata or {},
            },
        )

    async def publish_file_deleted(self, file_id: str, source_id: str) -> None:
        await self._publish(
            routing_key="file.deleted",
            message={
                "event": "file.deleted",
                "file_id": file_id,
                "source_id": source_id,
            },
        )

    async def _publish(self, routing_key: str, message: dict) -> None:
        """
        Publish a persistent message.  Opens a dedicated channel per call so
        concurrent publishes never share mutable channel state.  Retries once
        on any AMQP error after re-connecting.
        """
        for attempt in range(1, 3):
            try:
                if self._connection is None or self._connection.is_closed:
                    await self.connect()

                async with self._connection.channel() as channel:
                    exchange = await channel.declare_exchange(
                        self.exchange_name, ExchangeType.TOPIC, durable=True
                    )
                    # Must match the arguments used by the data-ingestion consumer.
                    # RabbitMQ raises PRECONDITION_FAILED if arguments differ.
                    queue = await channel.declare_queue(
                        self.queue_name,
                        durable=True,
                        arguments={"x-dead-letter-exchange": "file_events_dlx"},
                    )
                    await queue.bind(exchange, routing_key="file.#")

                    await exchange.publish(
                        Message(
                            body=json.dumps(message).encode(),
                            delivery_mode=DeliveryMode.PERSISTENT,
                        ),
                        routing_key=routing_key,
                    )
                logging.info("[messaging] published %s for %s", routing_key, message.get('file_id'))
                return

            except aio_pika.exceptions.AMQPError as exc:
                logging.warning("[messaging] publish attempt %d failed: %s", attempt, exc)
                if attempt < 2:
                    # Force reconnect before retrying
                    self._connection = None
                else:
                    logging.error(
                        "[messaging] exhausted retries for %s (file_id=%s): %s",
                        routing_key, message.get("file_id"), exc,
                    )
                    raise
