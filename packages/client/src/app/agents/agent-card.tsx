import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useNavigate } from "react-router";

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description?: string;
    tags?: string[];
    isConnected: boolean;
  };
}

export function AgentCard({ agent }: AgentCardProps) {
  const navigate = useNavigate();
  return (
    <Card
      key={agent.id}
      onClick={() => navigate(`/agents/${agent.id}`)}
      className="w-64"
    >
      <CardHeader>
        <CardTitle>
          <div className="flex align-middle justify-between">
            <span>{agent.name}</span>
            <span
              className={`mr-2 w-4 h-4 rounded-full inline-block ${agent.isConnected ? "bg-green-600" : "bg-red-500"}`}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="grow text-sm">
        {"isError" in agent && (
          <p className="text-red-700 font-bold mb-2">
            There is an error with this agent
          </p>
        )}
        {agent.description}
      </CardContent>
      {/* <CardFooter>
              <div>
                {c.isConnected ? (
                  <div className="flex">
                    <DocumentDuplicateIcon width={16} className="mr-1" />
                    {c.resources}
                    <ClipboardDocumentListIcon
                      width={16}
                      className="mr-1 ml-2"
                    />
                    {c.resourceTemplates}
                    <ChatBubbleOvalLeftEllipsisIcon
                      width={16}
                      className="mr-1 ml-2"
                    />
                    {c.prompts}
                    <WrenchScrewdriverIcon width={16} className="mr-1 ml-2" />
                    {c.tools}
                  </div>
                ) : (
                  <span className="text-sm opacity-70 italic">
                    Server is offline
                  </span>
                )}
              </div>
            </CardFooter> */}
    </Card>
  );
}
