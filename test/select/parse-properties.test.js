import parseProperties from '../../src/select/parse-properties';

describe(`strings`, () => {
  test(`1 element`, () => {
    expect(parseProperties(['a'])).toEqual({ a: {} });
  });
  test(`Multiple elements`, () => {
    expect(parseProperties(['a', 'b', 'c'])).toEqual({ a: {}, b: {}, c: {} });
  });
  test(`1 nested`, () => {
    expect(parseProperties(['a.b.c'])).toEqual({ a: { b: { c: {} } } });
  });
  test(`Multiple nested`, () => {
    expect(parseProperties(['a.b.c', 'a.c', 'b.c.d'])).toEqual({
      a: { b: { c: {} }, c: {} },
      b: { c: { d: {} } }
    });
  });
});

describe(`objects`, () => {
  test(`Just object`, () => {
    expect(parseProperties([{ a: { b: true, c: false }, b: true }])).toEqual({
      a: { b: {} },
      b: {}
    });
  });
  test(`Mixed on array`, () => {
    expect(
      parseProperties([{ a: { b: true, c: true }, b: true }, 'd', 'b.c'])
    ).toEqual({
      a: { b: {}, c: {} },
      b: { c: {} },
      d: {}
    });
  });
  test(`Mixed on array & object`, () => {
    expect(
      parseProperties([
        {
          a: { b: true, c: ['a.b', 'b', { d: true, e: 'd', f: 'a.b' }] },
          b: true
        },
        'd',
        'b.c',
        'a.d'
      ])
    ).toEqual({
      a: {
        b: {},
        c: {
          a: { b: {} },
          b: {},
          d: {},
          e: { d: {} },
          f: { a: { b: {} } }
        },
        d: {}
      },
      b: { c: {} },
      d: {}
    });
  });
});

describe(`throws`, () => {
  test(`input is not array`, () => {
    expect(() => parseProperties('string')).toThrow();
  });
  test(`property is not string/object/array`, () => {
    expect(() => parseProperties([() => {}])).toThrow();
  });
});
