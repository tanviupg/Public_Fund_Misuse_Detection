import { useEffect, useState } from "react";
import { UserPlus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { createUser, deleteUser, getUsers, updateUser } from "@/api/api";

interface UserRow {
  id: number;
  username: string;
  role: "admin" | "analyst" | "viewer";
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "analyst" | "viewer">("viewer");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data || []);
    } catch (err: any) {
      toast({ title: "Failed to load users", description: err?.message || "Try again." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!username || !password) {
      toast({ title: "Missing fields", description: "Provide username and password." });
      return;
    }
    try {
      await createUser({ username, password, role });
      toast({ title: "User created" });
      setUsername("");
      setPassword("");
      setRole("viewer");
      load();
    } catch (err: any) {
      toast({ title: "Create failed", description: err?.message || "Try again." });
    }
  };

  const handleUpdateRole = async (id: number, newRole: UserRow["role"]) => {
    try {
      await updateUser(id, { role: newRole });
      toast({ title: "Role updated" });
      load();
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.message || "Try again." });
    }
  };

  const handleResetPassword = async (id: number) => {
    const newPass = window.prompt("New password:");
    if (!newPass) return;
    try {
      await updateUser(id, { password: newPass });
      toast({ title: "Password updated" });
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.message || "Try again." });
    }
  };

  const handleDelete = async (id: number) => {
    const ok = window.confirm("Delete this user?" );
    if (!ok) return;
    try {
      await deleteUser(id);
      toast({ title: "User deleted" });
      load();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message || "Try again." });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold">User Management</h2>
        <p className="text-muted-foreground">Admins can create and manage users and roles.</p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="font-semibold mb-4">Create User</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="newuser" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRow["role"]) }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">admin</SelectItem>
                <SelectItem value="analyst">analyst</SelectItem>
                <SelectItem value="viewer">viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full gap-2" onClick={handleCreate}>
              <UserPlus className="w-4 h-4" /> Create
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="font-semibold mb-4">Users</h3>
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!loading && users.length === 0 && <p className="text-sm text-muted-foreground">No users found.</p>}
        {!loading && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold text-muted-foreground">Username</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Role</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Created</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="p-3 font-medium">{u.username}</td>
                    <td className="p-3">
                      <Select value={u.role} onValueChange={(v) => handleUpdateRole(u.id, v as UserRow["role"]) }>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">admin</SelectItem>
                          <SelectItem value="analyst">analyst</SelectItem>
                          <SelectItem value="viewer">viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 text-muted-foreground">{u.created_at?.slice(0, 10)}</td>
                    <td className="p-3 flex gap-2">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => handleResetPassword(u.id)}>
                        <Save className="w-3 h-3" /> Reset Password
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDelete(u.id)}>
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4">
          <Badge variant="outline">Viewer accounts can log in with any password.</Badge>
        </div>
      </div>
    </div>
  );
}
