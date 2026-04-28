const statusRules = {
  initiated: {
    vendor: { can: ["cancelled"] },
    warehouse: { can: ["approved", "rejected"] },
  },
  approved: {
    vendor: { can: ["shipped", "cancelled"] },
    warehouse: { can: ["cancelled"] },
  },
  shipped: {
    vendor: { can: [] },
    warehouse: { can: ["delivered"] },
  },
  delivered: {
    vendor: { can: [] },
    warehouse: { can: ["completed", "issue_reported"] },
  },
  issue_reported: {
    vendor: { can: [] },
    warehouse: { can: [] },
  },
  rejected: {
    vendor: { can: [] },
    warehouse: { can: [] },
  },
  cancelled: {
    vendor: { can: [] },
    warehouse: { can: [] },
  },
  completed: {
    vendor: { can: [] },
    warehouse: { can: [] },
  },
};


export { statusRules };