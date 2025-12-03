import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeploymentInstance, DeploymentStatus } from './deployment.entity';
import { CreateInstanceDto, InstallAppsDto } from './dto';

@Injectable()
export class DeploymentService {
  constructor(
    @InjectRepository(DeploymentInstance)
    private readonly deploymentRepository: Repository<DeploymentInstance>,
  ) {}

  async createInstance(dto: CreateInstanceDto) {
    // Check if domain already exists
    const existing = await this.deploymentRepository.findOne({
      where: { domain: dto.domain },
    });

    if (existing) {
      throw new BadRequestException(`Instance with domain ${dto.domain} already exists`);
    }

    // Create new instance
    const instance = this.deploymentRepository.create({
      domain: dto.domain,
      apps: dto.apps,
      region: dto.region,
      instanceType: dto.instanceType,
      description: dto.description,
      status: DeploymentStatus.PENDING,
      logs: `Instance creation requested at ${new Date().toISOString()}\n`,
    });

    const saved = await this.deploymentRepository.save(instance);

    // Trigger deployment process asynchronously
    this.triggerDeployment(saved.id).catch((error) => {
      console.error(`Deployment failed for instance ${saved.id}:`, error);
    });

    return saved;
  }

  async getStatus(id: string) {
    const instance = await this.deploymentRepository.findOne({ where: { id } });

    if (!instance) {
      throw new NotFoundException(`Instance with ID ${id} not found`);
    }

    return instance;
  }

  async listInstances() {
    return this.deploymentRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async deleteInstance(id: string) {
    const instance = await this.deploymentRepository.findOne({ where: { id } });

    if (!instance) {
      throw new NotFoundException(`Instance with ID ${id} not found`);
    }

    // TODO: Implement actual instance deletion (Lightsail, etc.)
    await this.deploymentRepository.remove(instance);

    return { success: true, message: 'Instance deleted successfully' };
  }

  async installApps(dto: InstallAppsDto) {
    const instance = await this.deploymentRepository.findOne({
      where: { id: dto.instanceId },
    });

    if (!instance) {
      throw new NotFoundException(`Instance with ID ${dto.instanceId} not found`);
    }

    // Add new apps to existing apps
    const updatedApps = [...new Set([...instance.apps, ...dto.apps])];

    instance.apps = updatedApps;
    instance.logs += `\nInstalling apps: ${dto.apps.join(', ')} at ${new Date().toISOString()}\n`;

    const updated = await this.deploymentRepository.save(instance);

    // Trigger app installation asynchronously
    this.triggerAppInstallation(instance.id, dto.apps).catch((error) => {
      console.error(`App installation failed for instance ${instance.id}:`, error);
    });

    return updated;
  }

  private async triggerDeployment(instanceId: string) {
    const instance = await this.deploymentRepository.findOne({
      where: { id: instanceId },
    });

    if (!instance) {
      return;
    }

    try {
      // Update status to provisioning
      await this.updateInstanceStatus(instanceId, DeploymentStatus.PROVISIONING,
        'Starting server provisioning...\n');

      // TODO: Phase C - Implement actual Lightsail provisioning
      // await this.provisionServer(instance);

      // Simulate provisioning
      await this.sleep(2000);
      await this.updateInstanceStatus(instanceId, DeploymentStatus.INSTALLING,
        'Server provisioned. Installing dependencies...\n');

      // TODO: Phase D - Implement repo bootstrap and build
      // await this.bootstrapRepo(instance);

      await this.sleep(3000);
      await this.updateInstanceStatus(instanceId, DeploymentStatus.BUILDING,
        'Dependencies installed. Building applications...\n');

      await this.sleep(3000);
      await this.updateInstanceStatus(instanceId, DeploymentStatus.CONFIGURING,
        'Build complete. Configuring services...\n');

      // TODO: Phase E - Implement app installation
      // await this.installApplications(instance);

      await this.sleep(2000);
      await this.updateInstanceStatus(instanceId, DeploymentStatus.READY,
        'Deployment complete! Instance is ready.\n');

      // Update instance with mock data
      instance.ipAddress = `13.125.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      instance.instanceId = `li-${Date.now()}`;
      await this.deploymentRepository.save(instance);

    } catch (error) {
      await this.updateInstanceStatus(instanceId, DeploymentStatus.FAILED,
        `Deployment failed: ${error.message}\n`);
      throw error;
    }
  }

  private async triggerAppInstallation(instanceId: string, apps: string[]) {
    const instance = await this.deploymentRepository.findOne({
      where: { id: instanceId },
    });

    if (!instance) {
      return;
    }

    try {
      instance.logs += `Installing apps: ${apps.join(', ')}...\n`;
      await this.deploymentRepository.save(instance);

      // TODO: Phase E - Implement actual app installation
      await this.sleep(2000);

      instance.logs += `Apps installed successfully: ${apps.join(', ')}\n`;
      await this.deploymentRepository.save(instance);

    } catch (error) {
      instance.logs += `App installation failed: ${error.message}\n`;
      await this.deploymentRepository.save(instance);
      throw error;
    }
  }

  private async updateInstanceStatus(
    instanceId: string,
    status: DeploymentStatus,
    logMessage: string,
  ) {
    const instance = await this.deploymentRepository.findOne({
      where: { id: instanceId },
    });

    if (instance) {
      instance.status = status;
      instance.logs += logMessage;
      await this.deploymentRepository.save(instance);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
