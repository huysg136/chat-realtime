export const planConfigs = {
  pricesVND: {
    free: 0,
    lite: 19000,
    pro: 59000,
    max: 89000
  },
  fileLimits: {
    free: "5 MB",
    lite: "10 MB",
    pro: "25 MB",
    max: "100 MB"
  },
  storageQuotas: {
    free: "100 MB",
    lite: "2 GB",
    pro: "10 GB",
    max: "30 GB"
  },
};

export const QUOTA_LIMIT = {
  free: 100 * 1024 * 1024,          // 200 MB
  lite: 2 * 1024 * 1024 * 1024,     // 2 GB
  pro: 10 * 1024 * 1024 * 1024,    // 10 GB
  max: 30 * 1024 * 1024 * 1024,    // 30 GB
};

export const FILE_SIZE_LIMIT = {
  free: 5 * 1024 * 1024,   // 5MB
  lite: 10 * 1024 * 1024,   // 10MB
  pro: 25 * 1024 * 1024,   // 25MB
  max: 100 * 1024 * 1024,  // 100MB
};
