import json
import re
from typing import Dict, Any
from controller.controller import ControllerAI, ControllerDecision, friday_controller
from agent.specialized_agents import get_agent, BaseSpecializedAgent
from services.executor import action_executor


class AgentOrchestratorCore:
    """
    Central Orchestrator Agent Core (Decision Engine).
    Coordinates between Controller AI for agent selection,
    specialized agents for model selection, and triggers backend real action execution.
    """

    def __init__(self, controller: ControllerAI = None):
        self.controller = controller or friday_controller

    def execute_task(self, question: str) -> Dict[str, str]:
        """
        Executes user query:
        1. Controller selects Agent ONLY.
        2. Agent selects Model (Groq or Gemini) and acts as Decision Engine.
        3. Parses action JSON decision and triggers real backend action executor.
        """
        # Step 1: Controller selects Agent ONLY
        decision: ControllerDecision = self.controller.select_agent(question)

        # Step 2: Retrieve designated Specialized Agent
        agent: BaseSpecializedAgent = get_agent(decision.agent_name)

        # Step 3: Execute Agent task (Decision Engine)
        result = agent.execute(question)

        # Step 4: Trigger Real Backend Executor for Action Mode JSON
        raw_answer = result["answer"]
        executed_answer = self._process_actions_if_any(raw_answer, question)

        return {
            "answer": executed_answer,
            "model_used": result["model_used"],
            "agent_used": agent.name
        }

    def _process_actions_if_any(self, answer_text: str, question: str) -> str:
        """Parses LLM Action JSON decision and triggers real backend execution."""
        try:
            clean_text = re.sub(r'```(?:json)?', '', answer_text).strip()

            json_match = re.search(r'\[.*\]', clean_text, re.DOTALL)
            if not json_match:
                json_match = re.search(r'\{.*\}', clean_text, re.DOTALL)

            if json_match:
                json_str = json_match.group(0).strip()
                if not json_str.startswith('['):
                    json_str = f"[{json_str}]"

                actions = json.loads(json_str)

                confirmations = []
                for act in actions:
                    if not isinstance(act, dict):
                        continue
                    action_name = act.get("action")
                    data = act.get("data", {})

                    if action_name:
                        res = action_executor.execute_action(action_name, data, question)
                        confirmations.append(res)

                if confirmations:
                    return "\n\n".join(confirmations)
        except Exception as e:
            print(f"[REAL ACTION EXECUTOR ERROR] {e}")

        return answer_text


# Singleton instance
friday_agent_core = AgentOrchestratorCore()


