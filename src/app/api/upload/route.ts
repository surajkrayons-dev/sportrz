// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAdminPrincipal();
    if (!user || !hasPermission(user, 'games.manage')) return NextResponse.json({ error: 'Game management access required.' }, { status: 403 });

    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: 'Cloudinary is not configured on the server.' }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'An image file is required.' }, { status: 400 });
    }
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, GIF, or AVIF images are allowed.' }, { status: 415 });
    }
    if (file.size < 1 || file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image size must be 5 MB or smaller.' }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'game-thumbnails', // Organize uploads in a folder
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      // Convert buffer to stream and pipe to uploadStream
      const Readable = require('stream').Readable;
      const readableInstanceStream = new Readable({
        read() {
          this.push(buffer);
          this.push(null);
        }
      });

      readableInstanceStream.pipe(uploadStream);
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}