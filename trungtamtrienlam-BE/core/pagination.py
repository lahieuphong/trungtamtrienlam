from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'pageSize'
    max_page_size = 100
    page_query_param = 'page'

    def get_paginated_response(self, data):
        return Response({
            'status': 200,
            'data': {
                'items': data,
                'total': self.page.paginator.count,
                'page': self.page.number,
                'pageSize': self.get_page_size(self.request),
                'totalPages': self.page.paginator.num_pages,
            }
        })

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'status': {'type': 'integer'},
                'data': {
                    'type': 'object',
                    'properties': {
                        'items': schema,
                        'total': {'type': 'integer'},
                        'page': {'type': 'integer'},
                        'pageSize': {'type': 'integer'},
                        'totalPages': {'type': 'integer'},
                    }
                }
            }
        }
