import { mockCompanyInfoProvider } from "./mock";
import { realCompanyInfoProvider } from "./real";

export function companyInfo() {
  return process.env.COMPANY_INFO_PROVIDER === "real" ? realCompanyInfoProvider : mockCompanyInfoProvider;
}
export type * from "./types";
