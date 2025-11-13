<template>
  <div class="dashboard">
    <div class="header">
      <h1>Webhook Management Dashboard</h1>
      <div class="stats-overview">
        <StatCard 
          v-for="stat in stats"
          :key="stat.title"
          :title="stat.title"
          :value="stat.value"
          :icon="stat.icon"
          :trend="stat.trend"
        />
      </div>
    </div>

    <div class="content-grid">
      <div class="recent-activity">
        <h2>Recent Activity</h2>
        <ActivityFeed :activities="recentActivities" />
      </div>
      
      <div class="webhook-status">
        <h2>Webhook Status</h2>
        <StatusGrid :webhooks="webhooks" />
      </div>
      
      <div class="analytics-charts">
        <h2>Performance Analytics</h2>
        <AnalyticsChart :data="analyticsData" />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useWebhookStore } from '../stores/webhook';
import StatCard from '../components/StatCard.vue';
import ActivityFeed from '../components/ActivityFeed.vue';
import StatusGrid from '../components/StatusGrid.vue';
import AnalyticsChart from '../components/AnalyticsChart.vue';

export default {
  name: 'Dashboard',
  components: {
    StatCard,
    ActivityFeed,
    StatusGrid,
    AnalyticsChart
  },
  setup() {
    const webhookStore = useWebhookStore();
    const stats = ref([]);
    const recentActivities = ref([]);
    const analyticsData = ref({});

    onMounted(async () => {
      await loadDashboardData();
    });

    const loadDashboardData = async () => {
      try {
        const [statsData, activitiesData, analyticsData] = await Promise.all([
          webhookStore.getStats(),
          webhookStore.getRecentActivities(),
          webhookStore.getAnalytics()
        ]);

        stats.value = statsData;
        recentActivities.value = activitiesData;
        analyticsData.value = analyticsData;
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };

    return {
      stats,
      recentActivities,
      analyticsData,
      webhooks: webhookStore.webhooks
    };
  }
};
</script>

<style scoped>
.dashboard {
  padding: 2rem;
}

.header {
  margin-bottom: 2rem;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 2rem;
}

.recent-activity {
  grid-column: 1;
  grid-row: 1;
}

.webhook-status {
  grid-column: 2;
  grid-row: 1;
}

.analytics-charts {
  grid-column: 1 / -1;
  grid-row: 2;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .recent-activity,
  .webhook-status,
  .analytics-charts {
    grid-column: 1;
  }
}
</style>