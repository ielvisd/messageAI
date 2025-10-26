<template>
  <q-page class="landing-page">
    <!-- Hero Section -->
    <div class="hero-section q-pa-xl text-center">
      <div class="hero-content q-mx-auto" style="max-width: 900px">

        <!-- Bold app title -->
        <h2 class="app-title text-h3 text-weight-bold text-accent q-mb-sm">
          OSSOME
        </h2>

        <div class="hero-badge q-mb-lg">
          <q-chip
            color="accent"
            text-color="white"
            label="🥋 OSS"
            class="q-pa-md text-weight-bold"
            style="font-size: 14px;"
          />
        </div>

        <h1 class="hero-title text-h1 text-weight-bold q-mb-lg">
          Your Gym's
          <span class="text-accent">AI-Powered</span>
          Training Hub
        </h1>

        <p class="hero-subtitle text-h6 q-mb-xl text-secondary-light" style="font-weight: 500;">
          Train harder. Stay connected. Never miss a class. Built for serious martial artists who demand excellence.
        </p>

        <div class="hero-actions q-gutter-md q-mb-xl">
          <q-btn
            size="lg"
            color="accent"
            text-color="white"
            label="START TRAINING"
            icon="fitness_center"
            unelevated
            @click="$router.push('/signup')"
            class="hero-cta"
            style="font-weight: 700; padding: 16px 40px;"
          />
          <q-btn
            size="lg"
            color="dark-gray"
            text-color="white"
            label="SEE AI IN ACTION"
            icon="smart_toy"
            outline
            @click="$router.push('/ai-assistant')"
            class="hero-secondary"
            style="font-weight: 600;"
          />
        </div>

        <!-- AI Features highlight -->
        <div class="ai-features q-mt-xl">
          <div class="text-body1 text-secondary-light q-mb-md">
            <strong class="text-accent">AI-Powered Features:</strong> Smart scheduling • Instant RSVPs • Training insights
          </div>
        </div>

      </div>
    </div>

    <!-- Features Section -->
    <div class="features-section q-pa-xl bg-surface">
      <div class="q-mx-auto" style="max-width: 1200px">
        <h2 class="section-title text-h2 text-weight-bold text-center text-white q-mb-xl">
          Built For Champions
        </h2>

        <div class="features-grid row q-gutter-xl">
          <!-- AI Assistant -->
          <div class="feature-card col-12 col-md-4">
            <q-card class="feature-card-content bg-dark-gray text-white" flat>
              <q-card-section>
                <div class="feature-icon q-mb-md">
                  <q-icon name="fitness_center" size="48px" color="accent" />
                </div>
                <h3 class="feature-title text-h5 text-weight-bold q-mb-md">
                  AI Training Assistant
                </h3>
                <p class="feature-description text-body1 text-secondary-light">
                  Your personal coach in your pocket. Get instant answers about classes, make RSVPs, and track your training progress with AI that remembers everything.
                </p>
              </q-card-section>
            </q-card>
          </div>

          <!-- Real-time Messaging -->
          <div class="feature-card col-12 col-md-4">
            <q-card class="feature-card-content bg-dark-gray text-white" flat>
              <q-card-section>
                <div class="feature-icon q-mb-md">
                  <q-icon name="chat_bubble" size="48px" color="accent" />
                </div>
                <h3 class="feature-title text-h5 text-weight-bold q-mb-md">
                  Elite Communication
                </h3>
                <p class="feature-description text-body1 text-secondary-light">
                  Professional-grade messaging for serious teams. Share techniques, coordinate sessions, and celebrate victories with your training family.
                </p>
              </q-card-section>
            </q-card>
          </div>

          <!-- Schedule Management -->
          <div class="feature-card col-12 col-md-4">
            <q-card class="feature-card-content bg-dark-gray text-white" flat>
              <q-card-section>
                <div class="feature-icon q-mb-md">
                  <q-icon name="schedule" size="48px" color="accent" />
                </div>
                <h3 class="feature-title text-h5 text-weight-bold q-mb-md">
                  Precision Scheduling
                </h3>
                <p class="feature-description text-body1 text-secondary-light">
                  Never miss a training session. Advanced scheduling with real-time availability, capacity tracking, and intelligent recommendations.
                </p>
              </q-card-section>
            </q-card>
          </div>

          <!-- Belt Progression -->
          <div class="feature-card col-12 col-md-4">
            <q-card class="feature-card-content bg-dark-gray text-white" flat>
              <q-card-section>
                <div class="feature-icon q-mb-md">
                  <q-icon name="trending_up" size="48px" color="accent" />
                </div>
                <h3 class="feature-title text-h5 text-weight-bold q-mb-md">
                  Progress Tracking
                </h3>
                <p class="feature-description text-body1 text-secondary-light">
                  Monitor your journey from white to black belt. Track attendance, skill development, and get insights to accelerate your growth.
                </p>
              </q-card-section>
            </q-card>
          </div>

          <!-- Push Notifications -->
          <div class="feature-card col-12 col-md-4">
            <q-card class="feature-card-content bg-dark-gray text-white" flat>
              <q-card-section>
                <div class="feature-icon q-mb-md">
                  <q-icon name="notifications_active" size="48px" color="accent" />
                </div>
                <h3 class="feature-title text-h5 text-weight-bold q-mb-md">
                  Real-Time Alerts
                </h3>
                <p class="feature-description text-body1 text-secondary-light">
                  Stay ahead of schedule changes, get class reminders, and receive instant updates about training opportunities.
                </p>
              </q-card-section>
            </q-card>
          </div>

          <!-- Cross-Platform -->
          <div class="feature-card col-12 col-md-4">
            <q-card class="feature-card-content bg-dark-gray text-white" flat>
              <q-card-section>
                <div class="feature-icon q-mb-md">
                  <q-icon name="devices" size="48px" color="accent" />
                </div>
                <h3 class="feature-title text-h5 text-weight-bold q-mb-md">
                  Train Anywhere
                </h3>
                <p class="feature-description text-body1 text-secondary-light">
                  Access your training data on iOS and web. Seamlessly sync your progress across all devices.
                </p>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="cta-section q-pa-xl text-center bg-dark-gray">
      <div class="q-mx-auto" style="max-width: 700px">
        <h2 class="cta-title text-h2 text-weight-bold text-white q-mb-lg">
          Ready to Train Like a Champion?
        </h2>
        <p class="cta-subtitle text-h6 text-secondary-light q-mb-xl" style="font-weight: 500;">
          Join the elite martial artists using AI to optimize their training and dominate their goals.
        </p>

        <div class="cta-actions q-gutter-md q-mb-lg">
          <q-btn
            size="lg"
            color="accent"
            text-color="white"
            label="START FREE TRIAL"
            icon="fitness_center"
            unelevated
            @click="$router.push('/signup')"
            class="cta-primary"
            style="font-weight: 700; padding: 18px 48px;"
          />
          <q-btn
            size="lg"
            color="surface"
            text-color="white"
            label="LOGIN TO TRAIN"
            icon="login"
            outline
            @click="$router.push('/login')"
            class="cta-secondary"
            style="font-weight: 600;"
          />
        </div>

        <div class="cta-footer text-body2 text-secondary-light q-mt-lg">
          ✓ No credit card required • ✓ 14-day free trial • ✓ Cancel anytime • ✓ AI Assistant included
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer q-pa-xl bg-deep-black text-white text-center">
      <div class="q-mx-auto" style="max-width: 900px">
        <div class="footer-content">
          <h3 class="text-h4 text-weight-bold text-accent q-mb-md">OSSOME</h3>
          <p class="text-h6 text-secondary-light q-mb-lg" style="font-weight: 500;">
            AI-powered training platform for elite martial artists
          </p>
          <div class="footer-links q-gutter-md q-mb-lg">
            <q-btn flat label="Privacy Policy" color="secondary-light" class="text-weight-medium" />
            <q-btn flat label="Terms of Service" color="secondary-light" class="text-weight-medium" />
            <q-btn flat label="Support" color="secondary-light" class="text-weight-medium" />
            <q-btn flat label="Contact" color="secondary-light" class="text-weight-medium" />
          </div>
          <div class="footer-copyright text-body2 text-secondary-light">
            © 2025 OSSOME. Built for champions who train harder than everyone else.
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
  background: #0d0d0d;
}

.hero-section {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  color: #ffffff;
  min-height: 90vh;
  display: flex;
  align-items: center;
  position: relative;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 30% 70%, rgba(255, 140, 0, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 70% 30%, rgba(0, 208, 132, 0.05) 0%, transparent 50%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-badge {
  animation: fadeInUp 0.8s ease-out;
}

.hero-title {
  animation: fadeInUp 0.8s ease-out 0.2s both;
  line-height: 1.1;
  font-size: 4rem;
}

.hero-subtitle {
  animation: fadeInUp 0.8s ease-out 0.4s both;
  color: #b0b0b0;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  font-size: 1.25rem;
  line-height: 1.6;
}

.hero-actions {
  animation: fadeInUp 0.8s ease-out 0.6s both;
}

.hero-cta {
  padding: 18px 48px;
  font-size: 18px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(255, 140, 0, 0.3);
  transition: all 0.3s ease;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hero-cta:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 16px 48px rgba(255, 140, 0, 0.4);
}

.hero-secondary {
  padding: 18px 36px;
  font-size: 16px;
  border-radius: 12px;
  border: 2px solid #2d2d2d;
  color: #ffffff !important;
  font-weight: 600;
  transition: all 0.3s ease;
}

.hero-secondary:hover {
  border-color: #ff8c00;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 140, 0, 0.2);
}

.ai-features {
  animation: fadeInUp 0.8s ease-out 0.8s both;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 24px;
}

.features-section {
  padding-top: 100px;
  padding-bottom: 100px;
  background: #262626;
}

.section-title {
  color: #ffffff;
  font-size: 3rem;
  letter-spacing: -0.02em;
}

.feature-card {
  margin-bottom: 40px;
}

.feature-card-content {
  height: 100%;
  transition: all 0.4s ease;
  border-radius: 16px;
  border: 1px solid #333333;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.feature-card-content:hover {
  transform: translateY(-12px) scale(1.02);
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.4);
  border-color: #ff8c00;
}

.feature-icon {
  display: flex;
  justify-content: center;
}

.feature-title {
  color: #ffffff;
  text-align: center;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.feature-description {
  line-height: 1.7;
  color: #b0b0b0;
  font-size: 1.1rem;
  text-align: center;
}

.cta-section {
  background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
  position: relative;
}

.cta-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(255, 140, 0, 0.08) 0%, transparent 70%);
  pointer-events: none;
}

.cta-title {
  color: #ffffff;
  font-size: 3rem;
  letter-spacing: -0.02em;
}

.cta-subtitle {
  color: #b0b0b0;
  font-size: 1.25rem;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
}

.cta-actions {
  animation: fadeInUp 0.8s ease-out;
}

.cta-primary {
  font-size: 18px;
  padding: 20px 56px;
  border-radius: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 8px 32px rgba(255, 140, 0, 0.3);
  transition: all 0.3s ease;
}

.cta-primary:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 16px 48px rgba(255, 140, 0, 0.4);
}

.cta-secondary {
  font-size: 16px;
  padding: 20px 40px;
  border-radius: 12px;
  border: 2px solid #333333;
  font-weight: 600;
  transition: all 0.3s ease;
}

.cta-secondary:hover {
  border-color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 255, 255, 0.1);
}

.cta-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 20px;
  color: #888888 !important;
}

.footer {
  margin-top: auto;
  background: #0d0d0d;
  border-top: 1px solid #1a1a1a;
}

.footer-content h3 {
  color: #ff8c00;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.footer-links {
  justify-content: center;
}

.footer-copyright {
  color: #666666 !important;
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .hero-section {
    padding: 80px 24px;
    min-height: 85vh;
  }

  .app-title {
    font-size: 2.5rem;
    margin-bottom: 20px;
  }

  .hero-badge {
    margin-bottom: 40px;
  }

  .hero-title {
    font-size: 2.8rem;
    line-height: 1.1;
    margin-bottom: 32px;
  }

  .hero-title span {
    display: block;
    margin-top: 12px;
  }

  .hero-subtitle {
    font-size: 1.2rem;
    line-height: 1.5;
    margin-bottom: 48px;
  }

  .hero-actions {
    flex-direction: column;
    gap: 20px;
  }

  .hero-cta, .hero-secondary {
    width: 100%;
    max-width: 320px;
    padding: 20px 32px;
    font-size: 16px;
    border-radius: 12px;
  }

  .features-section {
    padding: 80px 24px;
  }

  .section-title {
    font-size: 2.2rem;
    margin-bottom: 60px;
  }

  .features-grid {
    gap: 40px;
  }

  .feature-card {
    margin-bottom: 0;
  }

  .feature-card-content {
    padding: 40px 32px;
    border-radius: 20px;
  }

  .feature-icon {
    margin-bottom: 24px;
  }

  .feature-icon .q-icon {
    font-size: 64px;
  }

  .feature-title {
    font-size: 1.5rem;
    margin-bottom: 20px;
  }

  .feature-description {
    font-size: 1.1rem;
    line-height: 1.6;
  }

  .cta-section {
    padding: 80px 24px;
  }

  .cta-title {
    font-size: 2.2rem;
    margin-bottom: 32px;
  }

  .cta-subtitle {
    font-size: 1.2rem;
    margin-bottom: 40px;
  }

  .cta-actions {
    flex-direction: column;
    gap: 20px;
  }

  .cta-actions .q-btn {
    width: 100%;
    max-width: 320px;
    padding: 20px 32px;
    border-radius: 12px;
  }

  .footer {
    padding: 60px 24px;
  }

  .footer-content h3 {
    font-size: 1.8rem;
  }

  .footer-links {
    flex-direction: column;
    gap: 16px;
    margin: 32px 0;
  }
}
</style>
