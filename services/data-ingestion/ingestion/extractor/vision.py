from transformers import Blip2Processor, Blip2ForConditionalGeneration
from PIL import Image
import torch
from io import BytesIO
from loguru import logger

class Vision:
    def __init__(self, cache_dir=None):
        self.model_name = "Salesforce/blip2-opt-2.7b"
        self.cache_dir = cache_dir
        self.model = None
        self.load_model()

    def load_model(self):
        if self.model is None:
            logger.info("Loading BLIP-2 model...")
            self.processor = Blip2Processor.from_pretrained(self.model_name, cache_dir=self.cache_dir)
            self.model = Blip2ForConditionalGeneration.from_pretrained(self.model_name, cache_dir=self.cache_dir)
            logger.info("Model loaded successfully!")

    def vision(self, content, prompt="", max_length=100):
        self.load_model()

        try:
            image = Image.open(BytesIO(content)).convert('RGB')
            
            inputs = self.processor(image, text=prompt, return_tensors="pt")
            
            outputs = self.model.generate(
                **inputs, 
                max_length=max_length,
                min_length=5,
                num_beams=5,
                repetition_penalty=1.5,
                length_penalty=1.0,
                temperature=1.0
            )
            
            response = self.processor.decode(outputs[0], skip_special_tokens=True)
            
            return response
            
        except Exception as e:
            return f"Error processing image: {str(e)}"