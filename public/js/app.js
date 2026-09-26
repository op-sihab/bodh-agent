// BODH Application Bootstrap & Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  renderSubjectGrid();
  renderRecentChats();
  setTimeout(refreshGatewayHeaderStats, 800);
  setTimeout(fetchCreditStatus, 850);
});

// Global Keyboard Shortcut: Escape closes active modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeProfileModal();
    closeGatewayDashboardModal();
    closeMessageGatewayModal();
    closeCreditModal();
  }
});
