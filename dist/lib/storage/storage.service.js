"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = require("crypto");
let StorageService = class StorageService {
    client = null;
    getConfig() {
        return {
            endpoint: process.env.R2_ENDPOINT,
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
            bucket: process.env.R2_BUCKET_NAME,
            publicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
        };
    }
    getClient(config) {
        if (!this.client) {
            this.client = new client_s3_1.S3Client({
                region: 'auto',
                endpoint: config.endpoint,
                credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
            });
        }
        return this.client;
    }
    async uploadImage(file, folder = 'messages') {
        const config = this.getConfig();
        if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey || !config.bucket || !config.publicBaseUrl) {
            throw new common_1.ServiceUnavailableException('R2 storage is not configured (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL)');
        }
        const ext = file.originalname.split('.').pop() || 'bin';
        const key = `${folder}/${(0, crypto_1.randomUUID)()}.${ext}`;
        await this.getClient(config).send(new client_s3_1.PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        }));
        return `${config.publicBaseUrl}/${key}`;
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)()
], StorageService);
//# sourceMappingURL=storage.service.js.map