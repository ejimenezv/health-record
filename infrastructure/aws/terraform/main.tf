terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC - Use default VPC for simplicity
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security Group
resource "aws_security_group" "medrecord" {
  name        = "medrecord-${var.environment}"
  description = "Security group for MedRecord AI"
  vpc_id      = data.aws_vpc.default.id

  # HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  # HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  # SSH (restrict to your IP in production)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_ips
    description = "SSH"
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = {
    Name        = "medrecord-${var.environment}"
    Environment = var.environment
    Project     = "MedRecord-AI"
  }
}

# EC2 Key Pair
resource "aws_key_pair" "medrecord" {
  key_name   = "medrecord-${var.environment}"
  public_key = file(var.ssh_public_key_path)

  tags = {
    Name        = "medrecord-${var.environment}"
    Environment = var.environment
  }
}

# EC2 Instance
resource "aws_instance" "medrecord" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  key_name               = aws_key_pair.medrecord.key_name
  vpc_security_group_ids = [aws_security_group.medrecord.id]
  subnet_id              = data.aws_subnets.default.ids[0]

  root_block_device {
    volume_size           = var.volume_size
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true

    tags = {
      Name = "medrecord-${var.environment}-root"
    }
  }

  user_data = templatefile("${path.module}/user-data.sh", {
    environment = var.environment
  })

  tags = {
    Name        = "medrecord-${var.environment}"
    Environment = var.environment
    Project     = "MedRecord-AI"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Latest Ubuntu 22.04 AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Elastic IP
resource "aws_eip" "medrecord" {
  instance = aws_instance.medrecord.id
  domain   = "vpc"

  tags = {
    Name        = "medrecord-${var.environment}"
    Environment = var.environment
  }
}
