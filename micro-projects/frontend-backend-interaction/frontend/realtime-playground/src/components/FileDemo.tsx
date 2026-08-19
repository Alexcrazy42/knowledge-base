import { useState, useRef } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5009/api/file';

export function FileDemo() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [watermarkText, setWatermarkText] = useState('SAMPLE');
    const [isLoading, setIsLoading] = useState({
        image: false,
        download: false,
        watermark: false,
        video: false,
    });
    const videoRef = useRef<HTMLVideoElement>(null);

    // 1. Показать изображение в браузере (inline)
    const showImageInline = async () => {
        setIsLoading(prev => ({ ...prev, image: true }));
        try {
            const response = await axios.get(`${API_BASE}/image-small`, {
                responseType: 'blob',
            });
            
            const url = URL.createObjectURL(response.data);
            setImageUrl(url);
        } catch (error) {
            console.error('Error loading image:', error);
            alert('Не удалось загрузить изображение');
        } finally {
            setIsLoading(prev => ({ ...prev, image: false }));
        }
    };

    // 2. Скачать изображение как файл (attachment)
    const downloadImage = async () => {
        setIsLoading(prev => ({ ...prev, download: true }));
        try {
            const response = await axios.get(`${API_BASE}/image-small-with-name`, {
                responseType: 'blob',
            });
            
            // Создаем ссылку для скачивания
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            
            // Извлекаем имя файла из Content-Disposition
            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'cats.jpg';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (match && match[1]) {
                    fileName = match[1].replace(/['"]/g, '');
                }
            }
            
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Освобождаем URL
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            console.error('Error downloading image:', error);
            alert('Не удалось скачать изображение');
        } finally {
            setIsLoading(prev => ({ ...prev, download: false }));
        }
    };

    // 3. Сгенерировать изображение с водяным знаком
    const generateWatermark = async () => {
        if (!watermarkText.trim()) {
            alert('Введите текст для водяного знака');
            return;
        }
        
        setIsLoading(prev => ({ ...prev, watermark: true }));
        try {
            const response = await axios.get(`${API_BASE}/watermark`, {
                params: { text: watermarkText },
                responseType: 'blob',
            });
            
            const url = URL.createObjectURL(response.data);
            setImageUrl(url);
        } catch (error) {
            console.error('Error generating watermark:', error);
            alert('Не удалось создать изображение с водяным знаком');
        } finally {
            setIsLoading(prev => ({ ...prev, watermark: false }));
        }
    };

    // 4. Видео стриминг
    const playVideo = () => {
        if (videoRef.current) {
            videoRef.current.load();
            videoRef.current.play();
        }
    };

    const stopVideo = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    };

    return (
        <div className="demo-card file-demo">
            <h2>📁 Файлы</h2>
            <p className="subtitle">Загрузка, скачивание, генерация и стриминг</p>

            <div className="file-section">
                <h3>🖼️ Изображения</h3>
                <div className="button-group">
                    <button 
                        onClick={showImageInline} 
                        disabled={isLoading.image}
                        className="btn btn-primary"
                    >
                        {isLoading.image ? '⏳ Загрузка...' : '👁️ Показать'}
                    </button>
                    <button 
                        onClick={downloadImage} 
                        disabled={isLoading.download}
                        className="btn btn-success"
                    >
                        {isLoading.download ? '⏳ Скачивание...' : '⬇️ Скачать'}
                    </button>
                </div>

                {imageUrl && (
                    <div className="image-preview">
                        <img src={imageUrl} alt="Preview" />
                        <button 
                            className="btn-close"
                            onClick={() => {
                                URL.revokeObjectURL(imageUrl);
                                setImageUrl(null);
                            }}
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            <div className="file-section">
                <h3>💧 Водяной знак</h3>
                <div className="input-group">
                    <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="Текст водяного знака"
                        className="input-field"
                    />
                    <button 
                        onClick={generateWatermark} 
                        disabled={isLoading.watermark}
                        className="btn btn-warning"
                    >
                        {isLoading.watermark ? '⏳ Генерация...' : '🎨 Сгенерировать'}
                    </button>
                </div>
                <p className="hint">Введите текст и нажмите "Сгенерировать"</p>
            </div>

            <div className="file-section">
                <h3>🎬 Видео стриминг</h3>
                <div className="video-container">
                    <video
                        ref={videoRef}
                        controls
                        className="video-player"
                        preload="metadata"
                    >
                        <source src={`${API_BASE}/video-stream`} type="video/mp4" />
                        Ваш браузер не поддерживает видео
                    </video>
                </div>
                <div className="button-group">
                    <button onClick={playVideo} className="btn btn-primary">
                        ▶️ Play
                    </button>
                    <button onClick={stopVideo} className="btn btn-danger">
                        ⏹️ Stop
                    </button>
                    {/* <a 
                        href={`${API_BASE}/video-stream`} 
                        download="cats.mp4"
                        className="btn btn-success"
                    >
                        ⬇️ Скачать видео
                    </a> */}
                </div>
                <p className="hint">
                    📌 Поддерживает перемотку и частичную загрузку (HTTP Range)
                </p>
            </div>

            <div className="file-status">
                <span className="status-dot">🟢</span>
                <span className="status-text">Сервер доступен</span>
            </div>
        </div>
    );
}