import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import s3Client  from "./s3.js";

export const generateUploadUrl = async (req, res) => {
    try {
        const { fileName, fileType, productId, sku, userId, type } = req.body;

        if (!fileName || !fileType || !type) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
        }

        let key = "";

        if (type === "profile") {
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: "userId is required for profile uploads",
                });
            }
            key = `uploads/users/${userId}/${Date.now()}-${fileName}`;
        } else if (type === "product") {
            key = `uploads/products/${productId || "unassigned"}/${Date.now()}-${fileName}`;
        } else if (type === "variant") {
            if (!productId || !sku) {
                return res.status(400).json({
                    success: false,
                    message: "productId and sku are required for variant uploads",
                });
            }
            key = `uploads/products/${productId}/variants/${sku}/${Date.now()}-${fileName}`;
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid upload type",
            });
        }

        // 🪣 Create command
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            ContentType: fileType,
        });

        // 🔗 Generate signed URL
        const uploadUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 60, // 1 min
        });

        // 🌐 Final file URL (store in DB)
        const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        return res.status(200).json({
            success: true,
            uploadUrl,
            fileUrl,
            key,
        });
    } catch (error) {
        console.error("S3 Upload Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate upload URL",
        });
    }
};

export const getViewUrl = async (key) => {
    const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
    });

    const url = await getSignedUrl(s3Client, command, {
        expiresIn: 3600,
    });

    return url;
};

export const deleteFileByKey = async (key) => {
    if (!key) return;

    const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
    });

    await s3Client.send(command);
};