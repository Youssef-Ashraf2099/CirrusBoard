export class UpdateProjectDto {
  name?: string;
  description?: string;
  status?: "ACTIVE" | "ARCHIVED";
}
