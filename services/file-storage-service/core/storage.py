import boto3
import os
from botocore.exceptions import ClientError

class StorageService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=os.getenv('S3_ENDPOINT'),
            aws_access_key_id=os.getenv('S3_ACCESS_KEY'),
            aws_secret_access_key=os.getenv('S3_SECRET_KEY')
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
                print(f"Could not create bucket: {e}")

    def upload_stream(self, file_obj, object_name):
        try:
            self.s3_client.upload_fileobj(file_obj, self.bucket_name, object_name)
            return True
        except ClientError as e:
            print(f"Error uploading stream: {e}")
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
            print(f"Error generating presigned URL: {e}")
            return None
