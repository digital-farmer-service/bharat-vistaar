import { ChatInterface } from "@/components/ChatInterface";
import { Layout } from "@/components/Layout";

export default function ChatPage() {
  return (
    <Layout showFooter={false}>
      <div className="container mx-auto px-4 h-[calc(100vh-var(--header-height)-var(--input-height))] pt-1">
        <ChatInterface />
      </div>
    </Layout>
  );
}
