// Native fetch is used
async function test() {
  try {
    const email = `test_${Date.now()}@gmail.com`;
    console.log("Registering...", email);
    const res = await fetch("https://smart-queue-api-iaiv.onrender.com/api/session/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "AI Test Live", email, password: "password123" })
    });
    console.log("Register Status:", res.status);
    
    console.log("Logging in...");
    const loginRes = await fetch("https://smart-queue-api-iaiv.onrender.com/api/session/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123" })
    });
    const loginText = await loginRes.text();
    console.log("Login Status:", loginRes.status);
    console.log("Login Response:", loginText);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
