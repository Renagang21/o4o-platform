import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { DeploymentService } from './deployment.service';
import { CreateInstanceDto, InstallAppsDto } from './dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';

@Controller('deployment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeploymentController {
  constructor(private readonly deploymentService: DeploymentService) {}

  @Post('create')
  @Roles('admin', 'superadmin')
  createInstance(@Body() dto: CreateInstanceDto) {
    return this.deploymentService.createInstance(dto);
  }

  @Get('status/:id')
  @Roles('admin', 'superadmin', 'manager')
  getStatus(@Param('id') id: string) {
    return this.deploymentService.getStatus(id);
  }

  @Get('list')
  @Roles('admin', 'superadmin', 'manager')
  listInstances() {
    return this.deploymentService.listInstances();
  }

  @Post('install-apps')
  @Roles('admin', 'superadmin')
  installApps(@Body() dto: InstallAppsDto) {
    return this.deploymentService.installApps(dto);
  }

  @Delete(':id')
  @Roles('admin', 'superadmin')
  deleteInstance(@Param('id') id: string) {
    return this.deploymentService.deleteInstance(id);
  }
}
