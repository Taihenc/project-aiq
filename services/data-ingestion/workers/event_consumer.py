import pika
import json
import os
import threading
import time
from workers.ingestion_worker import IngestionWorker

class EventConsumer:
    def __init__(self):
        self.host = os.getenv('RABBITMQ_HOST', 'rabbitmq')
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
                self.connection = pika.BlockingConnection(pika.ConnectionParameters(host=self.host, heartbeat=0))
                self.channel = self.connection.channel()
                self.channel.exchange_declare(exchange=self.exchange_name, exchange_type='topic')
                self.channel.queue_declare(queue=self.queue_name, durable=True)
                self.channel.queue_bind(exchange=self.exchange_name, queue=self.queue_name, routing_key='file.#')
                self.channel.basic_qos(prefetch_count=1)
                print("Connected to RabbitMQ (Topic Exchange)")
                return
            except pika.exceptions.AMQPConnectionError:
                print(f"Failed to connect to RabbitMQ. Retrying in 5 seconds... ({retries} retries left)")
                time.sleep(5)
                retries -= 1
        print("Could not connect to RabbitMQ after multiple retries.")

    def start(self):
        if not self.connection or self.connection.is_closed:
            self.connect()

        if not self.channel:
            return

        print("Waiting for messages...")
        self.channel.basic_consume(queue=self.queue_name, on_message_callback=self.callback)
        try:
            self.channel.start_consuming()
        except Exception as e:
            print(f"Consumer stopped: {e}")

    def callback(self, ch, method, properties, body):
        try:
            message = json.loads(body)
            routing_key = method.routing_key
            print(f"Received event '{routing_key}': {message}")

            file_id = message.get('file_id')

            if routing_key == 'file.ready' or message.get('event') == 'file.ready':
                if file_id:
                    print(f"Processing ingestion for file {file_id}")
                    self.ingestion_worker.ingest_from_fss(file_id)

            elif routing_key == 'file.deleted' or message.get('event') == 'file.deleted':
                if file_id:
                    print(f"Processing deletion for file {file_id}")
                    self.ingestion_worker.delete_index(file_id)

            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            print(f"Error processing message: {e}")

    def start_in_thread(self):
        t = threading.Thread(target=self.start, daemon=True)
        t.start()
