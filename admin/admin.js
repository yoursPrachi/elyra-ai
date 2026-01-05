import "./utils.js";
import { initAnalytics } from "./analytics.js";
import { initBrain } from "./brain.js";
import { initApprovals } from "./approvals.js";
import { initUsers } from "./users.js";
import { initBulkQnA } from "./bulkQnA.js";
import { initScan } from "./scan.js";

window.addEventListener("DOMContentLoaded", () => {
  initAnalytics();
  initBrain();
  initApprovals();
  initUsers();
  initBulkQnA();
  initScan();
});
