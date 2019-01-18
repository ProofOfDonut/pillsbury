import functools

@functools.lru_cache(maxsize=128)
def read(filename):
    with open(filename, 'rt', encoding='utf8') as file:
        return file.read()
