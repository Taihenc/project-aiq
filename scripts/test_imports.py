try:
    from deepeval.models.base_model import DeepEvalBaseLLM
    print("✅ DeepEvalBaseLLM imported")
    from deepeval.metrics import ToolCorrectnessMetric, TaskCompletionMetric
    print("✅ Metrics imported")
except Exception as e:
    print(f"❌ Error: {e}")
