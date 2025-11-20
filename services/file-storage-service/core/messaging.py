import pika
import json
import os
import time

class MessagePublisher:
    def __init__(self):
        self.host = os.getenv('RABBITMQ_HOST', 'rabbitmq')
        self.queue_name = 'ingestion_queue'
        self.exchange_name = 'file_events_topic'
        self.connection = None
        self.channel = None

    def connect(self):
        retries = 5
        while retries > 0:
            try:
                self.connection = pika.BlockingConnection(pika.ConnectionParameters(host=self.host, heartbeat=0))
                self.channel = self.connection.channel()
                self.channel.exchange_declare(exchange=self.exchange_name, exchange_type='topic')
                self.channel.queue_declare(queue=self.queue_name, durable=True)
                self.channel.queue_bind(exchange=self.exchange_name, queue=self.queue_name, routing_key='file.#')
                print("Connected to RabbitMQ (Topic Exchange)")
                return
            except pika.exceptions.AMQPConnectionError:
                print(f"Failed to connect to RabbitMQ. Retrying in 5 seconds... ({retries} retries left)")
                time.sleep(5)
                retries -= 1
        print("Could not connect to RabbitMQ after multiple retries.")

    def publish_file_ready(self, file_id, file_name, metadata=None):
        self._publish(
            routing_key='file.ready',
            message={
                "event": "file.ready",
                "file_id": file_id,
                "file_name": file_name,
                "metadata": metadata or {}
            }
        )

    def publish_file_deleted(self, file_id, source_id):
        self._publish(
            routing_key='file.deleted',
            message={
                "event": "file.deleted",
                "file_id": file_id,
                "source_id": source_id
            }
        )

    def _publish(self, routing_key, message):
        if not self.channel or self.channel.is_closed:
            self.connect()

        if not self.channel:
            print("Cannot publish message, no connection.")
            return

        try:
            self.channel.basic_publish(
                exchange=self.exchange_name,
                routing_key=routing_key,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2,
                )
            )
            print(f" [x] Sent {routing_key} for {message.get('file_id')}")
        except Exception as e:
            print(f"Failed to publish message: {e}")
            self.connect()
