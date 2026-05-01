output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.medrecord.id
}

output "instance_public_ip" {
  description = "EC2 instance public IP"
  value       = aws_eip.medrecord.public_ip
}

output "instance_public_dns" {
  description = "EC2 instance public DNS"
  value       = aws_instance.medrecord.public_dns
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = "ssh ubuntu@${aws_eip.medrecord.public_ip}"
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.medrecord.id
}
