import { Webhook, IWebhook } from '../models/Webhook';
import { WebhookLog } from '../models/WebhookLog';
import axios from 'axios';
import { RateLimiter } from '../utils/RateLimiter';
import { WebhookValidator } from '../utils/WebhookValidator';

export class WebhookService {
  private rateLimiter: RateLimiter;
  private validator: WebhookValidator;

  constructor() {
    this.rateLimiter = new RateLimiter();
    this.validator = new WebhookValidator();
  }

  async createWebhook(userId: string, webhookData: Partial<IWebhook>): Promise<IWebhook> {
    const validation = this.validator.validateWebhook(webhookData);
    if (!validation.isValid) {
      throw new Error(`Invalid webhook data: ${validation.errors.join(', ')}`);
    }

    const webhook = new Webhook({
      ...webhookData,
      userId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return await webhook.save();
  }

  async sendWebhook(webhookId: string, message: any, options: any = {}): Promise<any> {
    const webhook = await Webhook.findById(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    if (!webhook.isActive) {
      throw new Error('Webhook is not active');
    }

    // Rate limiting check
    if (!this.rateLimiter.checkLimit(webhookId)) {
      throw new Error('Rate limit exceeded');
    }

    const startTime = Date.now();
    let response;
    let success = false;

    try {
      const payload = this.buildDiscordPayload(message, options);
      
      response = await axios.post(webhook.url, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Discord-Webhook-Manager/1.0'
        }
      });

      success = response.status >= 200 && response.status < 300;
      
    } catch (error: any) {
      response = error.response;
      throw error;
    } finally {
      // Log the webhook execution
      await this.logWebhookExecution(webhookId, {
        success,
        statusCode: response?.status,
        responseTime: Date.now() - startTime,
        message: success ? 'Webhook sent successfully' : error?.message,
        payload: message
      });
    }

    return response?.data;
  }

  async scheduleWebhook(webhookId: string, schedule: any, message: any): Promise<void> {
    // Implementation for scheduling webhooks
    const webhook = await Webhook.findById(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Add to scheduler
    // This would integrate with the scheduler service
  }

  private buildDiscordPayload(message: any, options: any): any {
    const basePayload: any = {
      content: message.content,
      embeds: message.embeds,
      username: options.username,
      avatar_url: options.avatar_url,
      tts: options.tts || false
    };

    // Remove undefined fields
    Object.keys(basePayload).forEach(key => {
      if (basePayload[key] === undefined) {
        delete basePayload[key];
      }
    });

    return basePayload;
  }

  private async logWebhookExecution(webhookId: string, logData: any): Promise<void> {
    const log = new WebhookLog({
      webhookId,
      ...logData,
      timestamp: new Date()
    });

    await log.save();
  }

  async getUserWebhooks(userId: string): Promise<IWebhook[]> {
    return await Webhook.find({ userId }).sort({ createdAt: -1 });
  }

  async getWebhookStats(webhookId: string): Promise<any> {
    const logs = await WebhookLog.find({ webhookId });
    const total = logs.length;
    const successful = logs.filter(log => log.success).length;
    const failed = total - successful;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0
    };
  }
}