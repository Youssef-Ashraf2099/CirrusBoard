apps/
└── backend/
└── src/
├── modules/
│ ├── tasks/
│ │ ├── dto/
│ │ ├── models/
│ │ ├── repositories/
│ │ ├── tasks.controller.ts
│ │ ├── tasks.service.ts
│ │ ├── tasks.module.ts
│ │ └── tasks.repository.ts
│ │
│ ├── comments/
│ ├── projects/
│ ├── users/
│ ├── auth/
│ └── teams/
│
├── infrastructure/
│ ├── dynamodb/
│ │ ├── dynamodb.module.ts
│ │ ├── dynamodb.service.ts
│ │ └── dynamodb.constants.ts
│ │
│ ├── s3/
│ ├── sns/
│ ├── sqs/
│ ├── cognito/
│ └── cloudwatch/
│
├── shared/
│ ├── guards/
│ ├── decorators/
│ ├── interceptors/
│ ├── middleware/
│ ├── enums/
│ ├── types/
│ ├── constants/
│ └── utils/
│
├── config/
│ ├── aws.config.ts
│ ├── app.config.ts
│ └── validation.ts
│
├── app.module.ts
└── main.ts
