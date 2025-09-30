export type OData = { "@odata.nextLink"?: string; "@odata.count"?: number };
export type GraphListResponse<T> = OData & { value: T[] };

export type GraphUser = {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  jobTitle?: string;
  "@odata.type"?: string; // "#microsoft.graph.user"
};

export type GraphUserLite = { id: string; userPrincipalName?: string; mail?: string };

export type newAccess = {
  mail: string;
  name: string
}