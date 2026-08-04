import { MeiliSearch } from "meilisearch";
import { env } from "../config/env.js";

export const meili = new MeiliSearch({
  host: env.MEILI_HOST,
  apiKey: env.MEILI_MASTER_KEY,
});

export const CUSTOMERS_INDEX = "customers";

export async function ensureMeiliIndexes() {
  try {
    const index = meili.index(CUSTOMERS_INDEX);
    await index.updateFilterableAttributes(["tenantId", "tags", "phone"]);
    await index.updateSearchableAttributes([
      "name",
      "phone",
      "email",
      "vehiclePlate",
      "vehicleBrand",
      "vehicleModel",
      "notes",
      "tags",
    ]);
  } catch (err) {
    console.warn("[meili] ensure indexes failed (is Meilisearch running?)", err);
  }
}

export async function indexCustomer(doc: {
  id: string;
  tenantId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  vehiclePlate?: string | null;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  notes?: string | null;
  tags: string[];
}) {
  try {
    await meili.index(CUSTOMERS_INDEX).addDocuments([doc]);
  } catch (err) {
    console.warn("[meili] indexCustomer failed", err);
  }
}

export async function removeCustomerFromIndex(id: string) {
  try {
    await meili.index(CUSTOMERS_INDEX).deleteDocument(id);
  } catch (err) {
    console.warn("[meili] removeCustomer failed", err);
  }
}
