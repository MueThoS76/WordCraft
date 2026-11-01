import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { AppUser, Capability, GroupDetail } from "../api/types";

export function GroupDetailPage({ id, onBack }: { id: string; onBack: () => void }) {
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  async function reload() {
    const [groupDetail, allCapabilities, allUsers] = await Promise.all([
      api.getGroup(id),
      api.listCapabilities(),
      api.listUsers(),
    ]);
    setGroup(groupDetail);
    setCapabilities(allCapabilities);
    setUsers(allUsers);
  }

  useEffect(() => {
    reload();
  }, [id]);

  if (!group) {
    return <p>Lädt …</p>;
  }

  const grantedCapabilityIds = new Set(group.capabilities.map((c) => c.capabilityId));
  const memberIds = new Set(group.members.map((m) => m.id));
  const assignableUsers = users.filter((user) => !memberIds.has(user.id));

  async function handleToggleCapability(capabilityId: string, granted: boolean) {
    if (granted) {
      await api.revokeCapability(id, capabilityId);
    } else {
      await api.grantCapability(id, capabilityId);
    }
    await reload();
  }

  async function handleToggleRequire2fa() {
    await api.updateGroup(id, { require2fa: !group!.require2fa });
    await reload();
  }

  async function handleAddMember() {
    if (!selectedUserId) {
      return;
    }
    await api.addGroupMember(id, selectedUserId);
    setSelectedUserId("");
    await reload();
  }

  async function handleRemoveMember(userId: string) {
    await api.removeGroupMember(id, userId);
    await reload();
  }

  return (
    <main className="group-detail">
      <header>
        <button type="button" onClick={onBack}>
          ← Zur Übersicht
        </button>
      </header>

      <h1>{group.name}</h1>
      <label className="inline-checkbox">
        <input type="checkbox" checked={group.require2fa} onChange={handleToggleRequire2fa} />
        2FA-Pflicht für diese Gruppe
      </label>

      <h2>Capabilities</h2>
      <ul className="capability-list">
        {capabilities.map((capability) => {
          const granted = grantedCapabilityIds.has(capability.id);
          return (
            <li key={capability.id}>
              <label className="inline-checkbox">
                <input
                  type="checkbox"
                  checked={granted}
                  onChange={() => handleToggleCapability(capability.id, granted)}
                />
                <strong>{capability.id}</strong> — {capability.description}
              </label>
            </li>
          );
        })}
      </ul>

      <h2>Mitglieder</h2>
      <ul className="member-list">
        {group.members.map((member) => (
          <li key={member.id}>
            {member.email}{" "}
            <button type="button" onClick={() => handleRemoveMember(member.id)}>
              Entfernen
            </button>
          </li>
        ))}
      </ul>

      <div className="add-member">
        <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
          <option value="">User auswählen …</option>
          {assignableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email}
            </option>
          ))}
        </select>
        <button type="button" onClick={handleAddMember} disabled={!selectedUserId}>
          Hinzufügen
        </button>
      </div>
    </main>
  );
}
