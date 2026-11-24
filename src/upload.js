// upload.js
// Converte o arquivo recebido em data URI base64 para salvar direto no BD.
// Não depende de filesystem nem de serviço externo.

export async function uploadFoto(req, res) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    // Validação de tipo (redundante com o fileFilter, mas garante)
    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!tiposPermitidos.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Formato inválido. Use PNG, JPG, WEBP ou GIF.' });
    }

    // Limite de 5MB (redundante com o multer, mas garante)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Imagem muito grande. Máximo 5MB.' });
    }

    // Converte para base64 data URI
    const base64 = file.buffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${base64}`;

    return res.json({ url: dataUri });
  } catch (error) {
    console.error('Erro upload:', error);
    return res.status(500).json({ error: 'Erro ao processar imagem.' });
  }
}