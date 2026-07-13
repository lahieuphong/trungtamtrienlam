import mimetypes
import re
from pathlib import Path
from urllib.parse import unquote
from urllib.parse import urlparse

from django.conf import settings
from django.http import FileResponse
from django.http import Http404
from django.http import HttpResponse
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


LOCAL_PUBLIC_TOKEN = 'local-public-token'
CHUNK_RANGE_RE = re.compile(r'bytes=(\d+)-(\d+)')


def _success(payload=None):
    return Response({
        'status': 200,
        'message': 'Lấy dữ liệu thành công',
        'data': payload,
        'errors': None,
    })


def _failure(message='Không tìm thấy tập tin', status=404):
    return Response({
        'status': status,
        'message': message,
        'data': None,
        'errors': [message],
    }, status=status)


def _normalize_media_path(path_file):
    path_file = unquote(path_file or '').replace('\\', '/').strip()
    if not path_file:
        raise Http404('File path is required')

    if path_file.startswith('http://') or path_file.startswith('https://'):
        path_file = urlparse(path_file).path

    media_url = (settings.MEDIA_URL or '/media/').strip() or '/media/'
    if path_file.startswith(media_url):
        path_file = path_file[len(media_url):]
    elif path_file.startswith('/media/'):
        path_file = path_file[len('/media/'):]

    path_file = path_file.lstrip('/')
    if not path_file or '..' in Path(path_file).parts:
        raise Http404('Invalid file path')

    return path_file


def _resolve_media_file(path_file):
    relative_path = _normalize_media_path(path_file)
    media_root = Path(settings.MEDIA_ROOT).resolve()
    file_path = (media_root / relative_path).resolve()

    if file_path != media_root and media_root not in file_path.parents:
        raise Http404('Invalid file path')

    if not file_path.is_file():
        raise Http404('File not found')

    return file_path, relative_path


class PublicTokenApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        return HttpResponse(LOCAL_PUBLIC_TOKEN, content_type='text/plain')


class FileViewApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        file_path, relative_path = _resolve_media_file(request.query_params.get('pathFile'))
        content_type = mimetypes.guess_type(relative_path)[0] or 'application/octet-stream'
        return FileResponse(open(file_path, 'rb'), content_type=content_type)


class FileGetSizeApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        try:
            file_path, _ = _resolve_media_file(request.data.get('pathFile'))
        except Http404 as exc:
            return _failure(str(exc))

        return _success({
            'size': file_path.stat().st_size,
        })


class FileDownloadApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        try:
            file_path, relative_path = _resolve_media_file(request.data.get('pathFile'))
        except Http404 as exc:
            return _failure(str(exc))

        content_type = mimetypes.guess_type(relative_path)[0] or 'application/octet-stream'
        response = FileResponse(open(file_path, 'rb'), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{file_path.name}"'
        response['file-size'] = str(file_path.stat().st_size)
        return response


class FileDownloadChunkApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        try:
            file_path, relative_path = _resolve_media_file(request.data.get('pathFile'))
        except Http404 as exc:
            return _failure(str(exc))

        file_size = file_path.stat().st_size
        range_header = request.headers.get('Content-Range') or request.META.get('HTTP_CONTENT_RANGE') or ''
        match = CHUNK_RANGE_RE.match(range_header.strip())
        if match:
            start = int(match.group(1))
            end = int(match.group(2))
        else:
            start = 0
            end = file_size - 1

        start = max(0, min(start, max(file_size - 1, 0)))
        end = max(start, min(end, file_size - 1))
        length = end - start + 1 if file_size else 0

        with open(file_path, 'rb') as file_obj:
            file_obj.seek(start)
            data = file_obj.read(length)

        content_type = mimetypes.guess_type(relative_path)[0] or 'application/octet-stream'
        response = HttpResponse(data, content_type=content_type, status=206 if match else 200)
        response['Accept-Ranges'] = 'bytes'
        response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
        response['Content-Length'] = str(len(data))
        response['Content-Disposition'] = f'attachment; filename="{file_path.name}"'
        response['file-size'] = str(file_size)
        return response
