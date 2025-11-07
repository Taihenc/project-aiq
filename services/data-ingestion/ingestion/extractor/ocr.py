from io import BytesIO
import numpy as np
from PIL import Image
from paddleocr import PaddleOCR

class OCR:
    def __init__(self, use_angle_cls=True):
        pass

        # self.paddle_ocr_thai = PaddleOCR(
        #     use_angle_cls=use_angle_cls,
        #     lang='th'
        # )

    def ocr(self, content):
        pass

        # image = Image.open(BytesIO(content)).convert('RGB')
        # content = np.array(image)
        
        # result_th = self.paddle_ocr_thai.predict(content)
        
        # text_th = None
        # if result_th and result_th[0] and result_th[0]['rec_texts']:
        #     text_th = " ".join(result_th[0]['rec_texts'])

        # return text_th
    