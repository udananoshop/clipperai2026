const API = "http://localhost:3001/api";

export const login = async (username, password) => {
  const res = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem("token", data.token);
  }

  return data;
};

export async function getMe() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) return null;

    return await res.json();
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("token");
  window.location.reload();
}
