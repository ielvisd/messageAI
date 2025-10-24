<template>
  <q-page class="landing-page">
    <!-- Hero Section -->
    <div class="hero-section q-pa-xl text-center">
      <div class="hero-content q-mx-auto" style="max-width: 800px">

        <!-- Add prominent app title -->
        <h2 class="app-title text-h4 text-weight-bold text-accent q-mb-sm">
          Ossome
        </h2>

        <div class="hero-badge q-mb-lg">
          <q-chip
            color="primary"
            text-color="white"
            label="🥋 For Everyone"
            class="q-pa-sm"
          />
        </div>

        <h1 class="hero-title text-h2 text-weight-bold q-mb-lg">
          Keep Your Team In Sync
          <span class="text-accent">On And Off The Mats</span>
        </h1>

        <p class="hero-subtitle text-body1 q-mb-xl">
          The fun way to stay connected with your BJJ community. Share wins, coordinate training, and keep the whole team in the loop.
        </p>

        <div class="hero-actions q-gutter-md q-mb-xl">
          <q-btn
            sizes="lg"
            color="primary"
            label="Get Started Free"
            icon="arrow_forward"
            unelevated
            @click="$router.push('/signup')"
            class="hero-cta"
          />
        </div>

        <!-- Removed stats for a cleaner, less nerdy hero -->
      </div>
    </div>

    <!-- Features Section -->
    <div class="features-section q-pa-xl bg-grey-1">
      <div class="q-mx-auto" style="max-width: 1200px">
        <h2 class="section-title text-h3 text-weight-bold text-center q-mb-xl">
          Made For The BJJ Community
        </h2>

        <div class="features-grid row q-gutter-xl">
          <!-- Real-time Messaging -->
          <div class="feature-card col-12 col-md-4">
            <q-card class="feature-card-content" flat>
              <q-card-section>
                <div class="feature-icon q-mb-md">
                  <q-icon name="chat_bubble" size="48px" color="primary" />
                </div>
                <h3 class="feature-title text-h6 text-weight-bold q-mb-md">
                  Announcements That Land
                </h3>
                <p class="feature-description text-body2">
                  Share class updates, celebrate belt promotions, and keep everyone excited about training.
                </p>
              </q-card-section>
            </q-card>
          </div>

          <!-- AI Assistant -->
          <div class="feature-card col-12 col-md-4">
            <q-card class="feature-card-content" flat>
              <q-card-section>
                <div class="feature-icon q-mb-md">
                  <q-icon name="smart_toy" size="48px" color="secondary" />
                </div>
                <h3 class="feature-title text-h6 text-weight-bold q-mb-md">
                  Your Coach's Assistant
                </h3>
                <p class="feature-description text-body2">
                  AI keeps track of everything so you can focus on what matters most - the training!
                </p>
              </q-card-section>
            </q-card>
          </div>

          <!-- Team Coordination -->
          <div class="feature-card col-12 col-md-4">
            <q-card class="feature-card-content" flat>
              <q-card-section>
                <div class="feature-icon q-mb-md">
                  <q-icon name="group_work" size="48px" color="positive" />
                </div>
                <h3 class="feature-title text-h6 text-weight-bold q-mb-md">
                  Teams That Flow
                </h3>
                <p class="feature-description text-body2">
                  Find training partners, share epic roll footage, and coordinate the fun stuff.
                </p>
              </q-card-section>
            </q-card>
          </div>

          <!-- Schedule Management -->
          <div class="feature-card col-12 col-md-4">
            <q-card class="feature-card-content" flat>
              <q-card-section>
                <div class="feature-icon q-mb-md">
                  <q-icon name="schedule" size="48px" color="info" />
                </div>
                <h3 class="feature-title text-h6 text-weight-bold q-mb-md">
                  Simple Scheduling
                </h3>
                <p class="feature-description text-body2">
                  Know what's next on the training schedule and never miss a session.
                </p>
              </q-card-section>
            </q-card>
          </div>

          <!-- Push Notifications -->
          <div class="feature-card col-12 col-md-4">
            <q-card class="feature-card-content" flat>
              <q-card-section>
                <div class="feature-icon q-mb-md">
                  <q-icon name="notifications" size="48px" color="warning" />
                </div>
                <h3 class="feature-title text-h6 text-weight-bold q-mb-md">
                  Always Notified
                </h3>
                <p class="feature-description text-body2">
                  Get instant updates about class changes and training opportunities.
                </p>
              </q-card-section>
            </q-card>
          </div>

          <!-- Cross-Platform -->
          <div class="feature-card col-12 col-md-4">
            <q-card class="feature-card-content" flat>
              <q-card-section>
                <div class="feature-icon q-mb-md">
                  <q-icon name="devices" size="48px" color="purple" />
                </div>
                <h3 class="feature-title text-h6 text-weight-bold q-mb-md">
                  Works Where You Train
                </h3>
                <p class="feature-description text-body2">
                  iPhone and web. Stay connected whether you're at the gym or on the go.
                </p>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="cta-section q-pa-xl text-center">
      <div class="q-mx-auto" style="max-width: 600px">
        <h2 class="cta-title text-h4 text-weight-bold q-mb-lg">
          Ready to Join the Fun?
        </h2>
        <p class="cta-subtitle text-body1 text-grey-7 q-mb-xl">
          Join the BJJ community that's making training more connected and enjoyable for everyone.
        </p>

        <div class="cta-actions q-gutter-md">
          <q-btn
            size="lg"
            color="primary"
            label="Start Free Trial"
            icon="rocket_launch"
            unelevated
            @click="$router.push('/signup')"
          />
          <q-btn
            size="lg"
            color="grey-7"
            text-color="white"
            label="Already have an account?"
            outline
            @click="$router.push('/login')"
          />
        </div>

        <div class="cta-footer text-caption text-grey-6 q-mt-lg">
          No credit card required • 14-day free trial • Cancel anytime
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer q-pa-lg bg-grey-9 text-white text-center">
      <div class="q-mx-auto" style="max-width: 800px">
        <div class="footer-content">
          <h3 class="text-h6 text-weight-bold q-mb-md">Ossome</h3>
          <p class="text-body2 q-mb-md">
            AI-powered communication for the BJJ community
          </p>
          <div class="footer-links q-gutter-sm">
            <q-btn flat dense label="Privacy" color="grey-4" />
            <q-btn flat dense label="Terms" color="grey-4" />
            <q-btn flat dense label="Support" color="grey-4" />
          </div>
          <div class="footer-copyright text-caption text-grey-5 q-mt-md">
            © 2025 Ossome. Made with ❤️ for the BJJ community.
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
}

.hero-section {
  background: linear-gradient(135deg, #2B2D42 0%, #4B4D62 100%);
  color: #ffffff;
  min-height: 80vh;
  display: flex;
  align-items: center;
}

.hero-badge {
  animation: fadeInUp 0.8s ease-out;
}

.hero-title {
  animation: fadeInUp 0.8s ease-out 0.2s both;
  line-height: 1.2;
}

.hero-subtitle {
  animation: fadeInUp 0.8s ease-out 0.4s both;
  color: rgba(255,255,255,0.92);
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
}

.hero-actions {
  animation: fadeInUp 0.8s ease-out 0.6s both;
}

.hero-cta {
  padding: 16px 32px;
  font-size: 18px;
  border-radius: 50px;
  box-shadow: 0 8px 32px rgba(43, 45, 66, 0.35);
  transition: all 0.3s ease;
}

.hero-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(43, 45, 66, 0.5);
}

.hero-secondary {
  padding: 16px 32px;
  font-size: 18px;
  border-radius: 50px;
  border-color: rgba(255, 255, 255, 0.35);
  color: #ffffff !important;
}

.stat-item {
  animation: fadeInUp 0.8s ease-out both;
}

.stat-item:nth-child(1) { animation-delay: 1s; }
.stat-item:nth-child(2) { animation-delay: 1.2s; }
.stat-item:nth-child(3) { animation-delay: 1.4s; }

.features-section {
  padding-top: 80px;
  padding-bottom: 80px;
}

.section-title {
  color: #2B2D42;
}

.feature-card {
  margin-bottom: 32px;
}

.feature-card-content {
  height: 100%;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border-radius: 16px;
}

.feature-card-content:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  display: flex;
  justify-content: center;
}

.feature-title {
  color: #2B2D42;
  text-align: center;
}

.feature-description {
  line-height: 1.6;
  color: #4B4D62;
}

.cta-section {
  background: linear-gradient(135deg, #f5f7fa 0%, #e6e9ef 100%);
}

.cta-title {
  color: #2c3e50;
}

.cta-actions {
  animation: fadeInUp 0.8s ease-out;
}

.footer {
  margin-top: auto;
}

.footer-content h3 {
  color: #2B2D42;
}

.footer-links {
  justify-content: center;
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .hero-section {
    padding: 60px 24px;
    min-height: 75vh;
  }

  .app-title {
    font-size: 2.2rem;
    margin-bottom: 16px;
  }

  .hero-badge {
    margin-bottom: 32px;
  }

  .hero-title {
    font-size: 2.5rem;
    line-height: 1.1;
    margin-bottom: 24px;
  }

  .hero-title span {
    display: block;
    margin-top: 8px;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    line-height: 1.4;
    margin-bottom: 40px;
  }

  .hero-actions {
    flex-direction: column;
    gap: 16px;
  }

  .hero-cta, .hero-secondary {
    width: 100%;
    max-width: 320px;
    padding: 18px 24px;
    font-size: 16px;
    border-radius: 28px;
  }

  .features-section {
    padding: 60px 24px;
  }

  .section-title {
    font-size: 2rem;
    margin-bottom: 48px;
  }

  .features-grid {
    padding: 0;
    gap: 32px;
  }

  .feature-card {
    margin-bottom: 0;
  }

  .feature-card-content {
    padding: 32px 24px;
    border-radius: 20px;
  }

  .feature-icon {
    margin-bottom: 20px;
  }

  .feature-icon .q-icon {
    font-size: 56px;
  }

  .feature-title {
    font-size: 1.4rem;
    margin-bottom: 16px;
  }

  .feature-description {
    font-size: 1rem;
    line-height: 1.5;
  }

  .cta-section {
    padding: 60px 24px;
  }

  .cta-title {
    font-size: 2rem;
    margin-bottom: 24px;
  }

  .cta-subtitle {
    font-size: 1.1rem;
    margin-bottom: 32px;
  }

  .cta-actions {
    flex-direction: column;
    gap: 16px;
  }

  .cta-actions .q-btn {
    width: 100%;
    max-width: 320px;
    padding: 18px 24px;
    border-radius: 28px;
  }

  .footer {
    padding: 48px 24px;
  }

  .footer-content h3 {
    font-size: 1.5rem;
  }

  .footer-links {
    margin: 24px 0;
  }
}
</style>
