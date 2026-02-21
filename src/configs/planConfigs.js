export const planConfigs = {
  pricesVND: {
    free: 0,
    lite: 15000,
    pro: 49000,
    max: 89000
  },
  fileLimits: {
    free: "5 MB",
    lite: "25 MB",
    pro: "100 MB",
    max: "200 MB"
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
  lite: 25 * 1024 * 1024,   // 25MB
  pro: 100 * 1024 * 1024,   // 100MB
  max: 200 * 1024 * 1024,  // 200MB
};
