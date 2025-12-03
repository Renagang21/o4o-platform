export interface DeploymentConfig {
  awsRegion: string;
  lightsailBlueprint: string;
  lightsailBundle: string;
  sshKeyName?: string;
  githubRepo: string;
  githubBranch: string;
}

export const defaultConfig: DeploymentConfig = {
  awsRegion: 'ap-northeast-2',
  lightsailBlueprint: 'amazon_linux_2023',
  lightsailBundle: 'nano_3_0',
  githubRepo: 'https://github.com/Renagang21/o4o-platform.git',
  githubBranch: 'develop',
};

export const bundleSizes = {
  nano_3_0: { ram: '512MB', cpu: '2vCPUs', storage: '20GB' },
  micro_3_0: { ram: '1GB', cpu: '2vCPUs', storage: '40GB' },
  small_3_0: { ram: '2GB', cpu: '2vCPUs', storage: '60GB' },
  medium_3_0: { ram: '4GB', cpu: '2vCPUs', storage: '80GB' },
};

export const regions = [
  { id: 'ap-northeast-2', name: 'Seoul', zone: 'ap-northeast-2a' },
  { id: 'us-east-1', name: 'N. Virginia', zone: 'us-east-1a' },
  { id: 'eu-west-1', name: 'Ireland', zone: 'eu-west-1a' },
];
