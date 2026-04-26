import pika
import json
import os
import threading
import time
from loguru import logger
from workers.ingestion_worker import IngestionWorker
from config import settings


class EventConsumer:
    def __init__(self):
        self.enabled = settings.enable_sharepoint_integration
        self.host = os.getenv('RABBITMQ_HOST', 'localhost')
        self.queue_name = 'ingestion_queue'
        self.exchange_name = 'file_events_topic'
        self.ingestion_worker = IngestionWorker()
        self.connection = None
        self.channel = None
        self.should_stop = False

    def connect(self):
        retries = 5
        while retries > 0:
            try:
                self.connection = pika.BlockingConnection(
                    pika.ConnectionParameters(host=self.host, heartbeat=0))
                self.channel = self.connection.channel()

                self.channel.exchange_declare(
                    exchange='file_events_dlx', exchange_type='fanout', durable=True)
                self.channel.queue_declare(queue='ingestion_dlq', durable=True)
                self.channel.queue_bind(
                    exchange='file_events_dlx', queue='ingestion_dlq')

                self.channel.exchange_declare(
                    exchange=self.exchange_name, exchange_type='topic', durable=True)
                self.channel.queue_declare(
                    queue=self.queue_name,
                    durable=True,
                    arguments={'x-dead-letter-exchange': 'file_events_dlx'},
                )
                self.channel.queue_bind(
                    exchange=self.exchange_name, queue=self.queue_name, routing_key='file.#')
                self.channel.basic_qos(prefetch_count=1)
                logger.info("Connected to RabbitMQ (Topic Exchange)")
                return
            except pika.exceptions.AMQPConnectionError:
                logger.warning(
                    f"Failed to connect to RabbitMQ. Retrying in 5 seconds... ({retries} retries left)")
                time.sleep(5)
                retries -= 1
        logger.error("Could not connect to RabbitMQ after multiple retries.")

    def start(self):
        if not self.enabled:
            logger.info("SharePoint integration is disabled - event consumer not started")
            return

        if not self.connection or self.connection.is_closed:
            self.connect()

        if not self.channel:
            return

        logger.info("Waiting for messages...")
        self.channel.basic_consume(
            queue=self.queue_name, on_message_callback=self.callback)
        try:
            self.channel.start_consuming()
        except Exception as e:
            logger.error(f"Consumer stopped: {e}")

    def callback(self, ch, method, properties, body):
        try:
            message = json.loads(body)
            routing_key = method.routing_key
            logger.info(f"Received event '{routing_key}': {message}")

            file_id = message.get('file_id')

            if routing_key == 'file.ready' or message.get('event') == 'file.ready':
                if file_id:
                    logger.info(f"Processing ingestion for file {file_id}")
                    self.ingestion_worker.ingest_from_fss(file_id)

            elif routing_key == 'file.deleted' or message.get('event') == 'file.deleted':
                if file_id:
                    logger.info(f"Processing deletion for file {file_id}")
                    self.ingestion_worker.delete_index(file_id)

            ch.basic_ack(delivery_tag=method.delivery_tag)
        except json.JSONDecodeError as e:
            logger.error(f"[consumer] Malformed message body, discarding: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except Exception as e:
            logger.error(f"[consumer] Error processing message, nacking with requeue: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    def start_in_thread(self):
        t = threading.Thread(target=self.start, daemon=True)
        t.start()
