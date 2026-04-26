import boto3
from loguru import logger
from botocore.client import Config
import os
from botocore.exceptions import ClientError

class StorageService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=os.getenv('S3_ENDPOINT', 'http://localhost:9000'),
            aws_access_key_id=os.getenv('S3_ACCESS_KEY', 'minioadmin'),
            aws_secret_access_key=os.getenv('S3_SECRET_KEY', 'minioadmin'),
            # Force path-style URLs so presigned URLs work correctly with MinIO.
            # Without this boto3 may produce virtual-hosted-style URLs that embed
            # the bucket name twice (e.g. ingestion-bucket/ingestion-bucket/...).
            config=Config(signature_version='s3v4', s3={'addressing_style': 'path'}),
        )
        self.bucket_name = os.getenv('S3_BUCKET', 'ingestion-bucket')
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError:
            try:
                self.s3_client.create_bucket(Bucket=self.bucket_name)
            except ClientError as e:
                logger.error(f"Could not create bucket: {e}")

    def upload_stream(self, file_obj, object_name):
        try:
            self.s3_client.upload_fileobj(file_obj, self.bucket_name, object_name)
            return True
        except ClientError as e:
            logger.error(f"Error uploading stream: {e}")
            return False

    def generate_presigned_url(self, object_name, expiration=3600):
        try:
            response = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': object_name},
                ExpiresIn=expiration
            )
            return response
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            return None

    def delete_object(self, object_name):
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=object_name)
            return True
        except ClientError as e:
            logger.error(f"Error deleting object: {e}")
            return False
