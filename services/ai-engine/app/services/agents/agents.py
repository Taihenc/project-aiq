class AgentService:
    def __init__(self):
        pass

    def create_agent(self):
        return {"message": "Agent created successfully"}

    def get_agents(self):
        return {"message": "Agents fetched successfully"}

    def get_agent(self, agent_id: str):
        return {"message": "Agent fetched successfully"}

    def update_agent(self, agent_id: str):
        return {"message": "Agent updated successfully"}

    def delete_agent(self, agent_id: str):
        return {"message": "Agent deleted successfully"}

