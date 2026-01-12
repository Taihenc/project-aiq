from storage import Storage
import base64

class Extractor:
    def __init__(self):
        self.storage = Storage()

    def extract(self, content):
        for ele in content:

            if ele["type"] == "Image":
                binary = base64.b64decode(ele["img_base64"])
                ele["text"] = self.vision.vision(binary)

        return content
