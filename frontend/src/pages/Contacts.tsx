import { useMemo, useState } from "react";
import { SearchInput } from "../components/SearchInput";
import { ContactRow } from "../components/ContactRow";
import { mockDirectory } from "../services/mockData";
import { useCall } from "../context/CallContext";

export function Contacts() {
  const [query, setQuery] = useState("");
  const [, forceUpdate] = useState(0);
  const { startCall, onlineUsers } = useCall();

  const contacts = useMemo(() => mockDirectory.contacts(), [query]);
  const q = query.trim().toLowerCase();
  const searchResults = q
    ? onlineUsers.filter((u) => u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
    : [];
  const existingIds = new Set(contacts.map((c) => c.id));
  const suggestions = searchResults.filter((u) => !existingIds.has(u.id));

  return (
    <div className="flex h-full flex-col">
      <div className="safe-top px-5 pb-2 pt-5">
        <h1 className="font-display text-[22px] font-semibold tracking-tight">Contacts</h1>
      </div>
      <div className="px-5">
        <SearchInput value={query} onChange={setQuery} />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {suggestions.length > 0 && (
          <div className="mt-4">
            <p className="px-5 text-[12px] font-medium uppercase tracking-wide text-muted/70">
              Online now — add as contact
            </p>
            {suggestions.map((u) => (
              <ContactRow
                key={u.id}
                user={u}
                onAdd={() => {
                  mockDirectory.addContact(u);
                  forceUpdate((n) => n + 1);
                }}
              />
            ))}
          </div>
        )}

        <div className="mt-4">
          <p className="px-5 text-[12px] font-medium uppercase tracking-wide text-muted/70">
            All contacts · {contacts.length}
          </p>
          {contacts.length === 0 ? (
            <p className="px-5 py-6 text-[14px] text-muted">No contacts yet. Search above to add someone.</p>
          ) : (
            contacts.map((c) => (
              <ContactRow key={c.id} user={c} onCall={(mode) => startCall(c, mode)} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
