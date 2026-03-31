from app.core.constants import MAX_PAGE_SIZE, MIN_PAGE_SIZE


def clamp_page_size(size: int) -> int:
    return max(MIN_PAGE_SIZE, min(size, MAX_PAGE_SIZE))


def calc_offset(page: int, page_size: int) -> int:
    return (max(1, page) - 1) * clamp_page_size(page_size)


def calc_total_pages(total: int, page_size: int) -> int:
    ps = clamp_page_size(page_size)
    return max(1, -(-total // ps))  # ceiling division
