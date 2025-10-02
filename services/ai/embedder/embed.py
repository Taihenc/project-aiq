from sentence_transformers import SentenceTransformer
# from openai import AzureOpenAI

class Embedder():

    def __init__(self, model='bge-m3'):
        self.models = [
            'bge-m3',
            'jina-embeddings-v4',
            'text-embedding-ada-002',
            'text-embedding-3-large',
        ]
        self.setModel(model)

        ### I dont know how to set this proper yet ###
        """
        self.client = AzureOpenAI(
            api_key="API_KEY", # replace api key
            api_version="2024-05-01-preview",
            azure_endpoint=""
        )
        """
        #######################################

    def getModelList(self):
        return self.models
    
    def getModel(self):
        return self.model_name
    
    def setModel(self, model):
        if model not in self.models:
            raise KeyError(
                f'Expected model name is {", ".join(self.models[:-1]) + f" or {self.models[-1]}" if len(self.models) > 1 else self.models[0]}, but got {model}'
            )
        self.model_name = model

        if self.model_name == 'bge-m3':
            self.model = SentenceTransformer("./bge-m3")

        if self.model_name == 'jina-embeddings-v4':
            pass

        
    def embed(self, texts):
        if not isinstance(texts, (str, list)) or (isinstance(texts, list) and not all(isinstance(item, str) for item in texts)):
            raise TypeError(
                f'Expected a string or a list of strings, but got {type(texts).__name__}'
            )
        
        # Self Hosting Model
        if self.model_name in ['bge-m3', 'jina-embeddings-v4']:
            emb = self.model.encode(texts, convert_to_tensor=True)
            return emb
        
        # API Model
        
        if self.model_name in ['text-embedding-ada-002', 'text-embedding-3-large']:
            """
            response = openai.Embedding.create(
                input=texts,
                model=self.model_name
            )
            return [d['embedding'] for d in response['data']]
            """
            return
            