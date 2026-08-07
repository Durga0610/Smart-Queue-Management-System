// Native fetch is used
async function test() {
  try {
    console.log("Pinging API...");
    const res = await fetch("https://smart-queue-api-iaiv.onrender.com/api/session/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "AI Test", email: `test_${Date.now()}@gmail.com`, password: "password123" })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
