import { Attachment } from '../tasks.model';

export class CreateTaskDto {
    title: string;
  
    description: string;
  
    priority: string;
  
    deadline: string;
  
    assigneeId: string;
  
    teamId: string;
  
    status?: string;

    attachments?: Attachment[];
  }