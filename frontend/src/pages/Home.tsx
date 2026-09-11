import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Header } from "../components/Header";
import { SearchInput } from "../components/SearchInput";
import { ContactRow } from "../components/ContactRow";
import { CallRow } from "../components/CallRow";
import { mockDirectory } from "../services/mockData";
import { useCall } from "../context/CallContext";
import { User } from "../types";

export function Home() {
  const [query, setQuery] = useState("");
  const { startCall } = useCall();
  const history = useMemo(() => mockDirectory.history().slice(0, 6), []);
  const results = query.trim() ? mockDirectory.search(query) : [];

  function handleCall(user: User, mode: "video" | "audio") {
    startCall(user, mode);
  }

  return (
    <div className="flex h-full flex-col">
      <Header />
      <div className="flex-1 overflow-y-auto no-scrollbar px-0 pb-24">
        <div className="px-5">
          <SearchInput value={query} onChange={setQuery} />
        </div>

        {results.length > 0 ? (
          <div className="mt-4">
            <p className="px-5 text-[12px] font-medium uppercase tracking-wide text-muted/70">People</p>
            <div className="mt-1">
              {results.map((u) => (
                <ContactRow key={u.id} user={u} onCall={(mode) => handleCall(u, mode)} />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-between px-5">
              <p className="text-[12px] font-medium uppercase tracking-wide text-muted/70">Recent</p>
            </div>
            <div className="mt-1">
              {history.length === 0 ? (
                <p className="px-5 py-6 text-[14px] text-muted">No calls yet. Start one below.</p>
              ) : (
                history.map((entry) => (
                  <CallRow key={entry.id} entry={entry} onCall={() => handleCall(entry.peer, entry.mode)} />
                ))
              )}
            </div>
          </>
        )}
      </div>

      <button
        onClick={() => setQuery(query ? "" : " ")}
        className="fixed bottom-24 right-5 z-20 flex h-14 items-center gap-2 rounded-full bg-accent px-5 text-[15px] font-medium text-white shadow-soft active:scale-95"
      >
        <Plus size={20} />
        New call
      </button>
    </div>
  );
}
