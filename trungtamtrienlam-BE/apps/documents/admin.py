from django.contrib import admin
from .models import Document, DocumentFile


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'number', 'document_type', 'status', 'issued_date']
    list_filter = ['status', 'document_type']
    search_fields = ['title', 'number']
