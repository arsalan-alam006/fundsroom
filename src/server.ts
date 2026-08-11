import "dotenv/config";
import app from "./app";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

app.listen(PORT, () => {
  console.log(`ERP+CRM API server listening on http://localhost:${PORT}`);
});
