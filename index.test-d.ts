import {expectType, expectError} from 'tsd';
import protocall, {Resolver} from '.';

expectType<Resolver>(protocall.getDefaultResolver());
expectType<Resolver>(protocall.getDefaultResolver('some-path'));
expectError<Resolver>(protocall.getDefaultResolver(12));