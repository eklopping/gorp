export function uploadUrl(relativePath: string) {
  return `/api/uploads/${relativePath.replace(/\\/g, "/")}`;
}
